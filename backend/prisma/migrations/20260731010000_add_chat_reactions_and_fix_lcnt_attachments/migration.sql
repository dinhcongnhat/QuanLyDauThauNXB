-- Chat reactions are stored per user and emoji so the same action is
-- idempotent and can be toggled safely from multiple realtime clients.
CREATE TABLE "project_message_reactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_message_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_message_reactions_message_id_user_id_emoji_key"
    ON "project_message_reactions"("message_id", "user_id", "emoji");
CREATE INDEX "project_message_reactions_message_id_idx"
    ON "project_message_reactions"("message_id");
CREATE INDEX "project_message_reactions_user_id_idx"
    ON "project_message_reactions"("user_id");

ALTER TABLE "project_message_reactions"
    ADD CONSTRAINT "project_message_reactions_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "project_messages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_message_reactions"
    ADD CONSTRAINT "project_message_reactions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Older auto-fill code copied `_attachments` from every completed LCNT step
-- into all following steps. Keep only files whose path belongs to the current
-- step. Unrelated legacy/external paths are retained to avoid data loss.
UPDATE "procurement_steps" AS step
SET "data" = jsonb_set(
    step."data"::jsonb,
    '{_attachments}',
    COALESCE(
        (
            SELECT jsonb_agg(item)
            FROM jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(step."data"::jsonb -> '_attachments') = 'array'
                        THEN step."data"::jsonb -> '_attachments'
                    ELSE jsonb_build_array(step."data"::jsonb -> '_attachments')
                END
            ) AS item
            WHERE
                COALESCE(
                    CASE
                        WHEN jsonb_typeof(item) = 'string'
                            THEN trim(BOTH '"' FROM item::text)
                        ELSE item ->> 'path'
                    END,
                    ''
                ) NOT LIKE 'lcnt/' || step."contractor_selection_id" || '/%'
                OR COALESCE(
                    CASE
                        WHEN jsonb_typeof(item) = 'string'
                            THEN trim(BOTH '"' FROM item::text)
                        ELSE item ->> 'path'
                    END,
                    ''
                ) LIKE 'lcnt/' || step."contractor_selection_id" || '/' || step."step_key" || '/%'
        ),
        '[]'::jsonb
    ),
    true
)
WHERE step."data" IS NOT NULL
  AND step."data"::jsonb ? '_attachments';

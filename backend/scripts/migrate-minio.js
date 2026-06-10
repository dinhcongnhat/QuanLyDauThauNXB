const Minio = require('minio');

async function migrate() {
  console.log('Starting S3/MinIO Migration...');
  
  // 1. Connection to Source (Old external Minio)
  const srcClient = new Minio.Client({
    endPoint: 'jtscminio.duckdns.org',
    port: 443,
    useSSL: true,
    accessKey: 'jtsc',
    secretKey: 'jtsc12345'
  });
  const srcBucket = 'qldanxb';

  // 2. Connection to Destination (New local Minio)
  // Connect via localhost since the script runs from the host machine
  const dstClient = new Minio.Client({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'jtsc',
    secretKey: 'jtsc12345'
  });
  const dstBucket = 'qldanxb';

  try {
    // Check/create destination bucket
    const exists = await dstClient.bucketExists(dstBucket);
    if (!exists) {
      console.log(`Creating destination bucket "${dstBucket}"...`);
      await dstClient.makeBucket(dstBucket);
    }

    console.log(`Listing objects in source bucket "${srcBucket}"...`);
    
    const stream = srcClient.listObjectsV2(srcBucket, '', true);
    let count = 0;
    
    for await (const obj of stream) {
      const name = obj.name;
      console.log(`Migrating object: ${name} (${obj.size} bytes)`);
      
      // Download stream from source
      const objStream = await srcClient.getObject(srcBucket, name);
      
      // Upload stream to destination
      await dstClient.putObject(dstBucket, name, objStream, obj.size);
      console.log(`Successfully migrated object: ${name}`);
      count++;
    }
    
    console.log(`Migration complete! Successfully migrated ${count} objects.`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();

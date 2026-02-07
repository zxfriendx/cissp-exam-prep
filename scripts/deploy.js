const ftp = require("basic-ftp")
const path = require("path")
require('dotenv').config({ path: '.env.local' });

async function deploy() {
    const client = new ftp.Client()
    client.ftp.verbose = true

    // Config from environment variables
    const config = {
        host: process.env.DEPLOY_HOST,
        user: process.env.DEPLOY_USER,
        password: process.env.DEPLOY_PASS,
        secure: true, // Try secure FTP first
        secureOptions: {
            rejectUnauthorized: false // Often needed for shared hosting self-signed certs
        }
    }

    const localBuilderDir = path.join(__dirname, "../out")
    const remoteDir = process.env.DEPLOY_REMOTE_DIR

    console.log(`Starting deployment to ${config.host}...`)
    console.log(`Local source: ${localBuilderDir}`)
    console.log(`Remote destination: ${remoteDir}`)

    try {
        await client.access(config)
        console.log("Connected successfully!")

        // Ensure remote directory exists
        await client.ensureDir(remoteDir)

        // Upload the directory
        console.log("Uploading files...")
        await client.uploadFromDir(localBuilderDir, remoteDir)

        console.log("Deployment completed successfully!")
    } catch (err) {
        console.error("Deployment failed:", err)
        process.exit(1)
    } finally {
        client.close()
    }
}

deploy()

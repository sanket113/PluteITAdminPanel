  import { S3Client, PutObjectCommand, PutObjectAclCommand } from "@aws-sdk/client-s3";
  import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
  import { defineSecret } from "firebase-functions/params";
  import { onRequest } from "firebase-functions/v2/https";
  import cors from "cors";
  import { logger } from "firebase-functions";
  import { PutObjectAclCommand } from "@aws-sdk/client-s3";

  // Enable CORS properly
  const corsHandler = cors({ origin: true, methods: ["POST", "OPTIONS"] });

  // Define secrets from Firebase
  const region = defineSecret("AWS_REGION");
  const accessKeyId = defineSecret("AWS_ACCESS_KEY_ID");
  const secretAccessKey = defineSecret("AWS_SECRET_ACCESS_KEY");
  const bucketName = defineSecret("AWS_BUCKET_NAME");

  export const generateUploadUrl = onRequest(
    { secrets: [region, accessKeyId, secretAccessKey, bucketName] },
    async (req, res) => {
      logger.info("🔥 Function triggered: generateUploadUrl");

      corsHandler(req, res, async () => {
        if (req.method === "OPTIONS") {
          res.set("Access-Control-Allow-Origin", "*");
          res.set("Access-Control-Allow-Methods", "POST");
          res.set("Access-Control-Allow-Headers", "Content-Type");
          res.status(204).send("");
          return;
        }

        if (req.method !== "POST") {
          logger.warn("🚫 Invalid method:", req.method);
          res.set("Access-Control-Allow-Origin", "*");
          return res.status(405).json({ error: "Method Not Allowed" });
        }

        try {
          const { uid, fileType, fileName } = req.body;

          if (!uid || !fileType || !fileName) {
            logger.error("❌ Missing parameters", { uid, fileType, fileName });
            res.set("Access-Control-Allow-Origin", "*");
            return res.status(400).json({ error: "Missing required parameters." });
          }

          const s3 = new S3Client({
            region: region.value(),
            credentials: {
              accessKeyId: accessKeyId.value(),
              secretAccessKey: secretAccessKey.value(),
            },
          });

          const fileKey = `${fileType}/${uid}/${fileName}`;
          logger.info("🔑 File Key:", fileKey);

          // Generate signed upload URL (temporary)
          const uploadParams = {
            Bucket: bucketName.value(),
            Key: fileKey,
            ContentType: fileType,
          };

          const uploadCommand = new PutObjectCommand(uploadParams);
          const uploadURL = await getSignedUrl(s3, uploadCommand, { expiresIn: 300 }); // 5 minutes

          // Construct permanent public URL
          const fileURL = `https://${bucketName.value()}.s3.${region.value()}.amazonaws.com/${fileKey}`;

          // Add a note in logs to remind setting ACL during/after upload
          logger.info("📌 After upload, client should call separate API or use AWS SDK to set ACL to 'public-read' for:", fileKey);

          // Optional: If you're planning to set the ACL here (after upload), you'd need to delay or verify upload is complete

          res.set("Access-Control-Allow-Origin", "*");
          res.status(200).json({
            uploadURL,
            fileKey,
            fileURL, // This is a public non-expiring URL if the object is public
          });
        } catch (error) {
          logger.error("🔥 Error generating upload URL:", error);
          res.set("Access-Control-Allow-Origin", "*");
          res.status(500).json({ error: "Internal Server Error" });
        }
      });
    }
  );


  // ✨ NEW FUNCTION to make file public
  export const makeFilePublic = onRequest(
    { secrets: [region, accessKeyId, secretAccessKey, bucketName] },
    async (req, res) => {
      const { fileKey } = req.body;

      const s3 = new S3Client({
        region: region.value(),
        credentials: {
          accessKeyId: accessKeyId.value(),
          secretAccessKey: secretAccessKey.value(),
        },
      });

      try {
        await s3.send(
          new PutObjectAclCommand({
            Bucket: bucketName.value(),
            Key: fileKey,
            ACL: "public-read",
          })
        );

        const fileURL = `https://${bucketName.value()}.s3.${region.value()}.amazonaws.com/${fileKey}`;
        res.status(200).json({ message: "✅ File made public", fileURL });
      } catch (error) {
        res.status(500).json({ error: "Failed to set public access", details: error });
      }
    }
  );
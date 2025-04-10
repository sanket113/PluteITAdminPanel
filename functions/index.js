//notification imports
import { onValueCreated, onValueUpdated, onValueDeleted } from "firebase-functions/v2/database";
import admin from "firebase-admin";
admin.initializeApp();


import { S3Client, PutObjectCommand, PutObjectAclCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import cors from "cors";
import { logger } from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { region, accessKeyId, secretAccessKey, bucketName } from "./secrets";


// Enable CORS
const corsHandler = cors({ origin: true, methods: ["POST", "OPTIONS"] });

// Define secrets
const region = defineSecret("AWS_REGION");
const accessKeyId = defineSecret("AWS_ACCESS_KEY_ID");
const secretAccessKey = defineSecret("AWS_SECRET_ACCESS_KEY");
const bucketName = defineSecret("AWS_BUCKET_NAME");

// 🚀 Function 1: generateUploadUrl
export const generateUploadUrl = onRequest(
  { secrets: [region, accessKeyId, secretAccessKey, bucketName] },
  async (req, res) => {
    logger.info("🔥 Triggered: generateUploadUrl");
    corsHandler(req, res, async () => {
      if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        return res.status(204).send("");
      }

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
      }

      try {
        const { uid, fileType, fileName } = req.body;

        if (!uid || !fileType || !fileName) {
          return res.status(400).json({ error: "Missing required parameters" });
        }

        const s3 = new S3Client({
          region: region.value(),
          credentials: {
            accessKeyId: accessKeyId.value(),
            secretAccessKey: secretAccessKey.value(),
          },
        });

        const fileKey = `${fileType}/${uid}/${fileName}`;

        const putCommand = new PutObjectCommand({
          Bucket: bucketName.value(),
          Key: fileKey,
          ContentType: fileType,
        });

        const uploadURL = await getSignedUrl(s3, putCommand, { expiresIn: 300 }); // 5 min

        const getCommand = new GetObjectCommand({
          Bucket: bucketName.value(),
          Key: fileKey,
        });

        const fileURL = `https://${bucketName.value()}.s3.${region.value()}.amazonaws.com/${fileKey}`;

        return res.status(200).json({
          uploadURL,
          fileKey,
          fileURL, // pre-build the URL (even before it's public)
        });
      } catch (error) {
        logger.error("❌ Error generating upload URL:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    });
  }
);

// 🚀 Function 2: makeFilePublic
export const makeFilePublic = onRequest(
  { secrets: [region, accessKeyId, secretAccessKey, bucketName] },
  async (req, res) => {
    logger.info("🔥 Triggered: makeFilePublic");
    corsHandler(req, res, async () => {
      if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        return res.status(204).send("");
      }

      try {
        const { fileKey } = req.body;

        if (!fileKey) {
          return res.status(400).json({ error: "Missing fileKey" });
        }

        const s3 = new S3Client({
          region: region.value(),
          credentials: {
            accessKeyId: accessKeyId.value(),
            secretAccessKey: secretAccessKey.value(),
          },
        });

        await s3.send(
          new PutObjectAclCommand({
            Bucket: bucketName.value(),
            Key: fileKey,
            ACL: "public-read",
          })
        );

        const fileURL = `https://${bucketName.value()}.s3.${region.value()}.amazonaws.com/${fileKey}`;
        return res.status(200).json({ message: "✅ File made public", fileURL });
      } catch (error) {
        logger.error("❌ Failed to set public ACL:", error);
        return res.status(500).json({ error: "Failed to make file public" });
      }
    });
  }
);

export const deleteImageFromS3 = onCall(
  { secrets: [region, accessKeyId, secretAccessKey, bucketName] },
  async (request) => {
    const key = request.data?.key;

    if (!key) {
      console.error("❌ No key provided in request.data");
      throw new HttpsError("invalid-argument", "Missing key");
    }

    const s3 = new S3Client({
      region: region.value(),
      credentials: {
        accessKeyId: accessKeyId.value(),
        secretAccessKey: secretAccessKey.value(),
      },
    });

    const params = {
      Bucket: bucketName.value(),
      Key: key,
    };

    try {
      const result = await s3.send(new DeleteObjectCommand(params));
      console.log("✅ Deleted from S3:", key);
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to delete from S3:", error.name, error.message);
      throw new HttpsError("internal", `Unable to delete image: ${error.message}`);
    }
  }
);


//notification

/**
 * Firebase Cloud Functions for PluteIT notifications.
 */

/**
   * Sends a push notification to subscribed users.
   * @param {Object} payload - The notification payload.
   * @return {Promise} A promise indicating the send status.
   */
function sendNotification(payload) {
  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      image: payload.image || "",
    },
    data: payload.data,
    topic: "pluteit-updates",
  };

  return admin
      .messaging()
      .send(message)
      .then((response) => {
        console.log("Notification sent successfully:", response);
        return null;
      })
      .catch((error) => {
        console.error("Error sending notification:", error);
      });
}

/**
   * Listens for new category additions and sends a notification.
   */
export const onCategoryAdded = onValueCreated("/categories/{categoryId}", (event) => {
  const category = event.data.val();
  const payload = {
    title: "New Category Added",
    body: `Category "${category.title}" has been added!`,
    image: category.image || "",
    type: "category_added",
    data: {
      categoryId: event.params.categoryId,
      title: category.title,
    },
  };
  return sendNotification(payload);
});

export const onCategoryUpdated = onValueUpdated("/categories/{categoryId}", (event) => {
  const before = event.data.before.val();
  const after = event.data.after.val();

  if (JSON.stringify(before) === JSON.stringify(after)) {
    return null; // No change
  }

  const payload = {
    title: "Category Updated",
    body: `Category "${after.title}" has been updated!`,
    image: after.image || "",
    type: "category_updated",
    data: {
      categoryId: event.params.categoryId,
      title: after.title,
    },
  };
  return sendNotification(payload);
});


export const onCategoryDeleted = onValueDeleted("/categories/{categoryId}", (event) => {
  const category = event.data.val();
  const payload = {
    title: "Category Deleted",
    body: `Category "${category.title}" has been removed!`,
    image: category.image || "",
    type: "category_deleted",
    data: {
      categoryId: event.params.categoryId,
      title: category.title,
    },
  };
  return sendNotification(payload);
});


export const onItemAdded = onValueCreated("/items/{itemId}", (event) => {
  const item = event.data.val();
  const payload = {
    title: "New Item Added",
    body: `Item "${item.name}" has been added!`,
    image: item.logo || "",
    type: "item_added",
    data: {
      itemId: event.params.itemId,
      name: item.name,
      categoryUid: item.categoryUid,
    },
  };
  return sendNotification(payload);
});

export const onItemUpdated = onValueUpdated("/items/{itemId}", (event) => {
  const before = event.data.before.val();
  const after = event.data.after.val();

  if (JSON.stringify(before) === JSON.stringify(after)) {
    return null;
  }

  const payload = {
    title: "Item Updated",
    body: `Item "${after.name}" has been updated!`,
    image: after.logo || "",
    type: "item_updated",
    data: {
      itemId: event.params.itemId,
      name: after.name,
      categoryUid: after.categoryUid,
    },
  };
  return sendNotification(payload);
});

export const onItemDeleted = onValueDeleted("/items/{itemId}", (event) => {
  const item = event.data.val();
  const payload = {
    title: "Item Deleted",
    body: `Item "${item.name}" has been removed!`,
    image: item.logo || "",
    type: "item_deleted",
    data: {
      itemId: item.itemId,
      name: item.name,
    },
  };
  return sendNotification(payload);
});
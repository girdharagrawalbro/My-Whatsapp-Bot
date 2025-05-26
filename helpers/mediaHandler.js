const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const FormData = require('form-data');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

// Upload only videos to Cloudinary, others to ImgBB
async function uploadMedia(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
    return await uploadToCloudinary(filePath, { resource_type: 'video' });
  } else if (['.xlsx', '.xls'].includes(ext)) {
    // Upload Excel to Cloudinary as well
    return await uploadToCloudinary(filePath, { resource_type: 'raw' });
  } else {
    return await uploadToImgBB(filePath);
  }
}

async function uploadToCloudinary(filePath, options = {}) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'whatsapp-bot',
      use_filename: true,
      unique_filename: false,
      access_mode: 'public',
      type: 'upload',
      ...options
    });

    console.log("✅ Cloudinary upload successful! URL:", result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error.message);
    throw error;
  }
}

async function uploadToImgBB(filePath) {
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(filePath));

    const response = await axios.post('https://api.imgbb.com/1/upload', form, {
      params: { key: IMGBB_API_KEY },
      headers: form.getHeaders()
    });

    return response.data.data.url;
  } catch (error) {
    console.error('ImageBB upload failed:', error);
    throw error;
  }
}

// async function shortenUrl(url) {
//   try {
//     if (!isValidUrl(url)) {
//       console.warn('Invalid URL provided:', url);
//       return url;
//     }

//     const encodedUrl = encodeURIComponent(url);
//     const tinyUrl = `https://tinyurl.com/api-create.php?url=${encodedUrl}`;

//     const response = await axios.get(tinyUrl, {
//       headers: {
//         'Accept': 'text/plain'
//       }
//     });

//     if (response.data && isValidUrl(response.data)) {
//       return response.data;
//     }

//     return url;
//   } catch (err) {
//     console.error('URL shortening failed:', err.message);
//     return url;
//   }
// }

// function isValidUrl(string) {
//   try {
//     new URL(string);
//     return true;
//   } catch (_) {
//     return false;
//   }
// }

async function downloadMediaFile(mediaUrl, localFilePath) {
  try {
    const response = await axios({
      method: 'get',
      url: mediaUrl,
      responseType: 'stream',
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: process.env.TWILIO_AUTH_TOKEN
      }
    });

    const writer = fs.createWriteStream(localFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const uploadedUrl = await uploadMedia(localFilePath);
    // const shortened = await shortenUrl(uploadedUrl);

    return { mediaUrls: uploadedUrl };
  } catch (error) {
    console.error('Error processing media file:', error);
    throw error;
  }
}

module.exports = { uploadMedia, downloadMediaFile };

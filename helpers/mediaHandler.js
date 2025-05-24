const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'];

async function uploadToImageBB(filePath) {
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(filePath));

    const response = await axios.post('https://api.imgbb.com/1/upload', form, {
      params: { key: process.env.IMGBB_API_KEY },
      headers: form.getHeaders()
    });

    return response.data.data.url;
  } catch (error) {
    console.error('ImageBB upload failed:', error);
    throw error;
  }
}

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

    const fileExt = path.extname(localFilePath).toLowerCase();
    if (VIDEO_EXTENSIONS.includes(fileExt)) {
      console.log('Skipped uploading video format:', fileExt);
      return { localPath: localFilePath, imageBBUrl: null, skipped: true };
    }

    const imageBBUrl = await uploadToImageBB(localFilePath);
    return { localPath: localFilePath, imageBBUrl, skipped: false };
  } catch (error) {
    console.error('Error processing media file:', error);
    throw error;
  }
}

module.exports = { uploadToImageBB, downloadMediaFile };

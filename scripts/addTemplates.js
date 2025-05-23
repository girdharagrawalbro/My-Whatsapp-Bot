const mongoose = require('mongoose');

const MessageTemplateSchema = new mongoose.Schema({
  name: String,
  content: String,
  category: String,
  isActive: Boolean
});
const MessageTemplate = mongoose.model('MessageTemplate', MessageTemplateSchema);

mongoose.connect('mongodb+srv://girdharagrawalbro:AbnlKNTT3ReFQLZm@cluster0.czsb19m.mongodb.net/whatsappBot?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    await MessageTemplate.insertMany([
      {
        name: "Introduction",
        content: "Hello, I am Amar Bansal.",
        category: "general",
        isActive: true
      },
      {
        name: "Address Info",
        content: "My address is: समता कॉलोनी, रायपुर, छत्तीसगढ़।",
        category: "general",
        isActive: true
      },
      {
        name: "Contact Info",
        content: "You can contact me at 8269910123. Office hours: 10 AM to 5 PM, Monday to Saturday.",
        category: "general",
        isActive: true
      },
      {
        name: "Full Introduction",
        content: "Hello, I am Amar Bansal. My address is: समता कॉलोनी, रायपुर, छत्तीसगढ़। You can contact me at 8269910123.",
        category: "general",
        isActive: true
      }
    ]);
    console.log('Templates added!');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
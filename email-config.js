// ============================================================
// ETLab OTP & Email Authentication Configuration
// ============================================================
//
// Target Recipient Email: mitvchirayath@gmail.com
//
// Web3Forms is configured and active with your verified key!
// ============================================================

window.ETLAB_CONFIG = {
  // Destination email where OTP is delivered
  recipientEmail: "mitvchirayath@gmail.com",

  // Active email provider: 'web3forms'
  provider: "web3forms",

  // Web3Forms Configuration
  web3forms: {
    accessKey: "3f19182a-c5e6-43bb-929c-23683e26c6ea"
  },

  // EmailJS Configuration (Backup)
  emailjs: {
    serviceId: "YOUR_EMAILJS_SERVICE_ID",
    templateId: "YOUR_EMAILJS_TEMPLATE_ID",
    publicKey: "YOUR_EMAILJS_PUBLIC_KEY"
  },

  // OTP Expiration time in minutes
  otpExpiryMinutes: 10
};

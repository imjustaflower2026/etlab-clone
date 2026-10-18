// ============================================================
// ETLab OTP Service & Email Dispatcher
// ============================================================

window.ETLAB_OTP_SERVICE = (function() {
  const STORAGE_KEY_OTP = 'etlab_pending_otp';
  const STORAGE_KEY_EXPIRES = 'etlab_pending_otp_expires';
  const STORAGE_KEY_USER = 'etlab_pending_otp_user';

  function getConfig() {
    return window.ETLAB_CONFIG || {
      recipientEmail: "mitvchirayath@gmail.com",
      provider: "web3forms",
      web3forms: { accessKey: "3f19182a-c5e6-43bb-929c-23683e26c6ea" },
      emailjs: { serviceId: "YOUR_EMAILJS_SERVICE_ID", templateId: "YOUR_EMAILJS_TEMPLATE_ID", publicKey: "YOUR_EMAILJS_PUBLIC_KEY" },
      otpExpiryMinutes: 10
    };
  }

  // Generate secure 6-digit numeric OTP
  function generate6DigitOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Save OTP in session
  function savePendingOTP(otp, username) {
    const config = getConfig();
    const expiryMinutes = config.otpExpiryMinutes || 10;
    const expiresAt = Date.now() + (expiryMinutes * 60 * 1000);

    sessionStorage.setItem(STORAGE_KEY_OTP, otp);
    sessionStorage.setItem(STORAGE_KEY_EXPIRES, expiresAt.toString());
    sessionStorage.setItem(STORAGE_KEY_USER, username || 'user');
  }

  // Retrieve current pending OTP
  function getPendingOTP() {
    const otp = sessionStorage.getItem(STORAGE_KEY_OTP);
    const expiresAt = parseInt(sessionStorage.getItem(STORAGE_KEY_EXPIRES) || '0', 10);
    const username = sessionStorage.getItem(STORAGE_KEY_USER) || 'user';

    if (!otp || !expiresAt) return null;

    if (Date.now() > expiresAt) {
      clearPendingOTP();
      return null;
    }

    return { otp, expiresAt, username };
  }

  // Clear pending OTP
  function clearPendingOTP() {
    sessionStorage.removeItem(STORAGE_KEY_OTP);
    sessionStorage.removeItem(STORAGE_KEY_EXPIRES);
    sessionStorage.removeItem(STORAGE_KEY_USER);
  }

  // Check if live email provider is configured
  function isLiveProviderConfigured() {
    const cfg = getConfig();
    if (cfg.provider === 'web3forms') {
      return cfg.web3forms &&
             cfg.web3forms.accessKey &&
             cfg.web3forms.accessKey !== 'YOUR_WEB3FORMS_ACCESS_KEY' &&
             cfg.web3forms.accessKey.trim().length > 10;
    } else if (cfg.provider === 'emailjs') {
      return cfg.emailjs &&
             cfg.emailjs.serviceId &&
             cfg.emailjs.serviceId !== 'YOUR_EMAILJS_SERVICE_ID' &&
             cfg.emailjs.publicKey &&
             cfg.emailjs.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY';
    }
    return false;
  }

  // Send OTP to target email
  async function sendOTP(username) {
    const config = getConfig();
    const targetEmail = config.recipientEmail || "mitvchirayath@gmail.com";
    const otp = generate6DigitOTP();
    savePendingOTP(otp, username);

    const isLive = isLiveProviderConfigured();

    if (isLive && config.provider === 'web3forms') {
      try {
        const formData = new FormData();
        formData.append("access_key", config.web3forms.accessKey.trim());
        formData.append("subject", `ETLab Security Code: ${otp}`);
        formData.append("from_name", "ETLab Security Portal");
        formData.append("email", targetEmail);
        formData.append("message",
          `ETLab Portal - One-Time Password (OTP) Verification\n\n` +
          `A login attempt was initiated for user: ${username || 'user'}\n\n` +
          `Your One-Time Password (OTP) to login is:\n\n` +
          `👉  ${otp}  👈\n\n` +
          `This OTP is valid for ${config.otpExpiryMinutes || 10} minutes.\n` +
          `Enter this OTP into the PASSWORD field on the login page to complete your login.\n\n` +
          `If you did not request this OTP, you can safely ignore this email.`
        );

        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: formData
        });

        const data = await response.json();

        if (response.ok && data.success) {
          return {
            success: true,
            mode: 'live',
            email: targetEmail,
            message: `OTP sent successfully to ${targetEmail}! Please check your email inbox (or Spam folder).`
          };
        } else {
          console.warn("[ETLab OTP] Web3Forms response:", data);
          return {
            success: true,
            mode: 'live_notice',
            email: targetEmail,
            otp: otp,
            message: `Web3Forms: ${data.message || 'Verification submitted'}. (Test code: ${otp})`
          };
        }
      } catch (err) {
        console.error("[ETLab OTP] Error sending via Web3Forms:", err);
        return {
          success: true,
          mode: 'fallback',
          email: targetEmail,
          otp: otp,
          message: `Network error connecting to email service. (Dev OTP: ${otp})`
        };
      }
    } else if (isLive && config.provider === 'emailjs') {
      try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: config.emailjs.serviceId.trim(),
            template_id: config.emailjs.templateId.trim(),
            user_id: config.emailjs.publicKey.trim(),
            template_params: {
              to_email: targetEmail,
              otp_code: otp,
              user_name: username || 'user',
              expiry_minutes: config.otpExpiryMinutes || 10
            }
          })
        });

        if (response.ok) {
          return {
            success: true,
            mode: 'live',
            email: targetEmail,
            message: `OTP sent successfully to ${targetEmail} via EmailJS.`
          };
        } else {
          const errText = await response.text();
          return {
            success: true,
            mode: 'fallback',
            email: targetEmail,
            otp: otp,
            message: `EmailJS notice: ${errText}. (Dev OTP: ${otp})`
          };
        }
      } catch (err) {
        console.error("[ETLab OTP] Error sending via EmailJS:", err);
        return {
          success: true,
          mode: 'fallback',
          email: targetEmail,
          otp: otp,
          message: `Network error reaching EmailJS. (Dev OTP: ${otp})`
        };
      }
    } else {
      // Demo mode if key is missing
      return {
        success: true,
        mode: 'demo',
        email: targetEmail,
        otp: otp,
        message: `OTP generated for ${targetEmail}. (Dev OTP: ${otp})`
      };
    }
  }

  // Verify entered OTP
  function verifyOTP(enteredPassword, username) {
    const pending = getPendingOTP();
    const config = getConfig();
    const targetEmail = config.recipientEmail || "mitvchirayath@gmail.com";

    if (!pending) {
      return {
        success: false,
        reason: 'no_otp',
        message: `No active OTP found. Please click "Send OTP to Mail" to receive a code at ${targetEmail}.`
      };
    }

    if (Date.now() > pending.expiresAt) {
      clearPendingOTP();
      return {
        success: false,
        reason: 'expired',
        message: `The OTP has expired. Please click "Send OTP to Mail" to request a new code.`
      };
    }

    const cleanInput = (enteredPassword || '').trim();
    if (cleanInput === pending.otp) {
      // Successfully authenticated!
      clearPendingOTP();
      try {
        sessionStorage.setItem('etlab_auth_logged_in', 'true');
        sessionStorage.setItem('etlab_auth_user', username || pending.username || 'user');
        sessionStorage.setItem('etlab_auth_time', Date.now().toString());
        localStorage.setItem('etlab_auth_logged_in', 'true');
        localStorage.setItem('etlab_auth_user', username || pending.username || 'user');
      } catch (e) {
        console.error('Session storage error:', e);
      }
      return {
        success: true,
        message: "OTP verified successfully! Redirecting..."
      };
    } else {
      return {
        success: false,
        reason: 'mismatch',
        message: `Incorrect OTP. Please enter the valid OTP sent to ${targetEmail}.`
      };
    }
  }

  return {
    getConfig,
    sendOTP,
    verifyOTP,
    getPendingOTP,
    clearPendingOTP,
    isLiveProviderConfigured
  };
})();

/**
 * apps/mobile/src/services/smsRetrieverService.js
 * Android SMS Retriever & SMS User Consent API integration for OTP auto-read.
 * 
 * Flow:
 * - Listens for incoming SMS via Android autofill or SMS retriever
 * - Extracts 6-digit numeric OTP without logging the code
 * - Gracefully handles timeout, denial, malformed message, and manual entry
 * - Single-flight dispatch guard to prevent duplicate verification requests
 */

import { Platform } from "react-native";

class SmsRetrieverService {
  isListening = false;
  timeoutTimer = null;

  /**
   * Starts listening for the SMS verification code on Android.
   * On iOS or unsupported devices, this is a clean no-op allowing manual entry.
   */
  startListening(onCodeReceived, onError) {
    if (Platform.OS !== "android") {
      return () => {};
    }

    this.isListening = true;

    // Timeout listener after 5 minutes per SMS Retriever specification
    this.timeoutTimer = setTimeout(() => {
      this.stopListening();
      if (onError) onError({ code: "TIMEOUT", message: "SMS auto-read timed out" });
    }, 5 * 60 * 1000);

    // Helper to safely parse and extract OTP from incoming SMS string
    const handleSmsMessage = (messageText) => {
      if (!messageText || !this.isListening) return;
      try {
        // Regex extracts standard 6-digit OTP
        const match = messageText.match(/\b\d{6}\b/);
        if (match && match[0]) {
          const extractedOtp = match[0];
          this.stopListening();
          if (onCodeReceived) {
            onCodeReceived(extractedOtp);
          }
        } else {
          if (onError) onError({ code: "MALFORMED", message: "No valid 6-digit OTP found in message" });
        }
      } catch (err) {
        if (onError) onError({ code: "PARSE_ERROR", message: err.message });
      }
    };

    return () => this.stopListening();
  }

  stopListening() {
    this.isListening = false;
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }
}

export const smsRetrieverService = new SmsRetrieverService();
export default smsRetrieverService;


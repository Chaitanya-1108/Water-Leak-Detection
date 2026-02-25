import logging
import os
import smtplib
from email.mime.text import MIMEText
from typing import Optional

# Configure logging for notifications
logger = logging.getLogger("leak_notifications")
logger.setLevel(logging.INFO)

# Ensure logs actually print to console if no other handlers exist
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class NotificationManager:
    def __init__(self):
        self.notification_enabled = True
        self.alert_email = os.getenv("ALERT_EMAIL", "admin@leakwatch.ai")
        self.alert_phone = os.getenv("ALERT_PHONE", "+1234567890")
        
        # SMTP Settings
        self.smtp_server = os.getenv("SMTP_SERVER")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.smtp_from = os.getenv("SMTP_FROM", "alerts@leakwatch.ai")
        
    def send_leak_alert(self, severity: str, location: str, analysis: str):
        """
        Sends an urgent notification based on the severity.
        In production, this would call Twilio or SendGrid APIs.
        """
        if not self.notification_enabled:
            return

        message = (
            f"🚨 URGENT: {severity} Leak Detected! 🚨\n"
            f"Location: {location}\n"
            f"Analysis: {analysis}\n"
            f"Action: Immediate inspection required."
        )

        # 1. Simulate SMS (Twilio Placeholder)
        self._simulate_sms(message)

        # 2. Simulate Email (SendGrid Placeholder)
        self._simulate_email(message)

    def _simulate_sms(self, message: str):
        # In a real app, you'd use Twilio:
        # from twilio.rest import Client
        # client = Client(account_sid, auth_token)
        # client.messages.create(body=message, from_=twilio_num, to=self.alert_phone)
        logger.info(f"📱 [SMS SENDING SIMULATION] -> {self.alert_phone}")
        logger.info(f"Message: {message}")

    def _simulate_email(self, message: str):
        """Attempts to send real email if SMTP is configured, else logs a professional simulation."""
        if all([self.smtp_server, self.smtp_user, self.smtp_password]):
            try:
                msg = MIMEText(message)
                msg['Subject'] = '🚨 URGENT: LeakWatch AI Alert'
                msg['From'] = self.smtp_from
                msg['To'] = self.alert_email

                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)
                logger.info(f"📧 [REAL EMAIL SENT] -> {self.alert_email}")
            except Exception as e:
                logger.error(f"❌ Failed to send real email: {e}")
        else:
            logger.info(f"📧 [EMAIL SENDING SIMULATION] -> {self.alert_email}")
            logger.info(f"Message: {message}")
            logger.warning("To enable real emails, configure SMTP_SERVER, SMTP_USER, and SMTP_PASSWORD in your .env file.")

notification_manager = NotificationManager()

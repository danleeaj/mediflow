from twilio.rest import Client
import os

import dotenv
dotenv.load_dotenv()

client = Client(os.getenv("ACCOUNT_SID"), os.getenv("AUTH_TOKEN"))

message = "hi"

# Get credentials from environment variables
account_sid = os.getenv("ACCOUNT_SID")
auth_token = os.getenv("AUTH_TOKEN")

# Get phone numbers from environment or use defaults
sender_number = os.getenv("WHATSAPP_FROM")
recipient_number = os.getenv("PATIENT_WHATSAPP_NUMBER", "6588663319")

# Initialize Twilio client
client = Client(account_sid, auth_token)

formatted_message = message

# Send the WhatsApp message
message_obj = client.messages.create(
    from_=f'whatsapp:+{sender_number}',
    body=formatted_message,
    to=f'whatsapp:+{recipient_number}'
)

print(f"WhatsApp notification successfully sent to patient at +{recipient_number}. Message ID: {message_obj.sid}")
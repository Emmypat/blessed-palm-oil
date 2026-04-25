import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
from datetime import date


def _smtp_client():
    host = os.environ.get("SES_SMTP_HOST", "email-smtp.eu-west-1.amazonaws.com")
    port = int(os.environ.get("SES_SMTP_PORT", "465"))
    user = os.environ.get("SES_SMTP_USER", "")
    password = os.environ.get("SES_SMTP_PASSWORD", "")
    if not user or not password:
        return None
    ctx = ssl.create_default_context()
    server = smtplib.SMTP_SSL(host, port, context=ctx)
    server.login(user, password)
    return server


def send_receipt_email(to_email: str, customer_name: str, sale_id: int, pdf_bytes: bytes) -> bool:
    sender = os.environ.get("SES_SENDER_EMAIL", "")
    if not sender:
        return False
    try:
        msg = MIMEMultipart()
        msg["From"] = f"Blessed Palm Oil <{sender}>"
        msg["To"] = to_email
        msg["Subject"] = f"Receipt for your purchase — Sale #{sale_id}"
        msg.attach(MIMEText(
            f"Dear {customer_name},\n\nThank you for your purchase. Please find your receipt attached.\n\nBlessed Palm Oil",
            "plain"
        ))
        part = MIMEBase("application", "pdf")
        part.set_payload(pdf_bytes)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="receipt-{sale_id}.pdf"')
        msg.attach(part)
        server = _smtp_client()
        if not server:
            return False
        server.sendmail(sender, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Receipt email error: {e}")
        return False


def send_reminder_email(to_email: str, customer_name: str, balance: float, due_date: date | None, sale_id: int) -> bool:
    sender = os.environ.get("SES_SENDER_EMAIL", "")
    if not sender:
        return False
    try:
        due_str = due_date.strftime("%d %B %Y") if due_date else "as soon as possible"
        overdue = due_date and due_date < date.today()
        subject = (
            f"⚠️ Payment Overdue — Blessed Palm Oil (Sale #{sale_id})"
            if overdue else
            f"Payment Reminder — Blessed Palm Oil (Sale #{sale_id})"
        )
        body = (
            f"Dear {customer_name},\n\n"
            + (
                f"This is a reminder that your payment of ₦{balance:,.2f} on Sale #{sale_id} "
                f"was due on {due_str} and is now overdue.\n\n"
                if overdue else
                f"This is a friendly reminder that your payment of ₦{balance:,.2f} on Sale #{sale_id} "
                f"is due on {due_str}.\n\n"
            )
            + "Please contact us to arrange payment at your earliest convenience.\n\n"
            + "Thank you,\nBlessed Palm Oil"
        )
        msg = MIMEMultipart()
        msg["From"] = f"Blessed Palm Oil <{sender}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        server = _smtp_client()
        if not server:
            return False
        server.sendmail(sender, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Reminder email error: {e}")
        return False

import logging
import random
import string

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

CODE_LENGTH = 6
CODE_EXPIRY_MINUTES = 15

# Values copied from .env.example — treated as "not configured" so we use dev print mode
# instead of failing SMTP auth against Gmail with fake credentials.
_PLACEHOLDER_SMTP_USERS = frozenset(
    {
        "your-email@gmail.com",
        "youremail@gmail.com",
        "yourgmail@gmail.com",
    }
)
_PLACEHOLDER_SMTP_PASSWORDS = frozenset(
    {
        "your-app-password",
        "your_app_password_here",
        "your-app-password-here",
    }
)


def is_smtp_configured() -> bool:
    """Return True when real SMTP credentials are set (not empty and not template placeholders)."""
    u = (settings.smtp_user or "").strip().lower()
    p = (settings.smtp_password or "").strip().lower()
    if not u or u in _PLACEHOLDER_SMTP_USERS:
        return False
    if not p or p in _PLACEHOLDER_SMTP_PASSWORDS:
        return False
    return True


def generate_verification_code() -> str:
    return "".join(random.choices(string.digits, k=CODE_LENGTH))


async def send_verification_email(to_email: str, code: str, name: str = "") -> None:
    """Send a 6-digit verification code to the user's email.

    In development (no SMTP credentials configured) the code is printed to
    stdout so you can test without a real mail server.
    """
    greeting = f"Hi {name}," if name else "Hi there,"

    if not is_smtp_configured():
        logger.info("[DEV] Email verification code for %s: %s", to_email, code)
        print(f"\n{'='*50}")
        print(f"[DEV] Verification code for {to_email}")
        print(f"      Code: {code}")
        print(f"{'='*50}\n")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = "Your CareerCore verification code"
    message["From"] = settings.smtp_from or settings.smtp_user
    message["To"] = to_email

    plain = (
        f"{greeting}\n\n"
        f"Your CareerCore verification code is: {code}\n\n"
        f"This code expires in {CODE_EXPIRY_MINUTES} minutes.\n\n"
        "If you did not request this, please ignore this email."
    )

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; margin:0; padding:0; }}
    .wrapper {{ max-width:480px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08); }}
    .header {{ background:#6366f1; padding:32px; text-align:center; }}
    .header h1 {{ color:#fff; margin:0; font-size:22px; font-weight:700; }}
    .body {{ padding:32px; }}
    .code-box {{ background:#f4f4f5; border-radius:8px; padding:20px; text-align:center; margin:24px 0; }}
    .code {{ font-size:40px; font-weight:800; letter-spacing:10px; color:#6366f1; }}
    .footer {{ padding:16px 32px; font-size:12px; color:#9ca3af; border-top:1px solid #f0f0f0; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>CareerCore</h1></div>
    <div class="body">
      <p>{greeting}</p>
      <p>Use the verification code below to confirm your email address.</p>
      <div class="code-box"><span class="code">{code}</span></div>
      <p>This code expires in <strong>{CODE_EXPIRY_MINUTES} minutes</strong>.</p>
      <p>If you did not create a CareerCore account, you can safely ignore this email.</p>
    </div>
    <div class="footer">CareerCore &bull; Career intelligence platform</div>
  </div>
</body>
</html>"""

    message.attach(MIMEText(plain, "plain"))
    message.attach(MIMEText(html, "html"))

    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        start_tls=True,
    )

    logger.info("Verification email sent to %s", to_email)

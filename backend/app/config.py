from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./blessedpalmoil_dev.db"
    aws_region: str = "eu-west-1"
    ses_sender_email: str = ""
    ses_smtp_user: str = ""
    ses_smtp_password: str = ""
    s3_bucket_name: str = ""
    environment: str = "development"
    jwt_secret_key: str = ""          # MUST be set via environment variable in production
    whatsapp_phone: str = "2349032139394"   # business WhatsApp number (international format)

    class Config:
        env_file = ".env"

settings = Settings()

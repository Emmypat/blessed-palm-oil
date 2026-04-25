from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./cementtrack.db"
    aws_region: str = "eu-west-1"
    ses_sender_email: str = "patkatech@gmail.com"
    ses_smtp_user: str = ""
    ses_smtp_password: str = ""
    s3_bucket_name: str = ""
    environment: str = "development"
    jwt_secret_key: str = "cementtrack-secret-change-in-production"

    class Config:
        env_file = ".env"


settings = Settings()

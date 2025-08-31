terraform {
  required_version = ">= 1.3"
  backend "s3" {
    bucket         = "easymed-terraform-state"
    key            = "root/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "easymed-terraform-locks"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

module "persistent" {
  source         = "./modules/persistent"
  aws_region     = var.aws_region
  aws_access_key = var.aws_access_key
  aws_secret_key = var.aws_secret_key
}

module "app" {
  source             = "./modules/app"
  aws_region         = var.aws_region
  aws_access_key     = var.aws_access_key
  aws_secret_key     = var.aws_secret_key
  postgres_disk_name = module.persistent.postgres_disk_name
}

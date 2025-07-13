provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

resource "aws_lightsail_key_pair" "github_actions_key" {
  name       = "github-actions-key"
  public_key = file("~/.ssh/github-actions.pub")
}

resource "aws_lightsail_disk" "postgres_disk" {
  name              = "postgres-disk"
  size_in_gb        = 50
  availability_zone = "us-east-1a"

  lifecycle {
    prevent_destroy = false
  }
}

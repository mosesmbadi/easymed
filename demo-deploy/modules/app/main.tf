provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

resource "aws_lightsail_instance" "app_server" {
  name              = "my-app-server"
  availability_zone = "us-east-1a"
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = "micro_2_0"
  key_pair_name     = "github-actions-key"
  user_data         = file("${path.module}/init.sh")
}

resource "aws_lightsail_disk_attachment" "postgres" {
  disk_name     = var.postgres_disk_name
  instance_name = aws_lightsail_instance.app_server.name
  disk_path     = "/dev/xvdf"
  depends_on    = [aws_lightsail_instance.app_server]
}

resource "aws_lightsail_key_pair" "github_actions_key" {
  name       = "github-actions-key"
  public_key = file("~/.ssh/github-actions.pub")
}

resource "aws_lightsail_instance_public_ports" "app_server_ports" {
  instance_name = aws_lightsail_instance.app_server.name
  port_info {
    protocol = "tcp"
    from_port = 22
    to_port = 22
  }
  port_info {
    protocol = "tcp"
    from_port = 80
    to_port = 80
  }
  port_info {
    protocol = "tcp"
    from_port = 3000
    to_port = 3000
  }
  port_info {
    protocol = "tcp"
    from_port = 8000
    to_port = 8000
  }
  port_info {
    protocol = "tcp"
    from_port = 8080
    to_port = 8080
  }
  port_info {
    protocol = "tcp"
    from_port = 9090
    to_port = 9090
  }
  port_info {
    protocol = "tcp"
    from_port = 9091
    to_port = 9091
  }
}


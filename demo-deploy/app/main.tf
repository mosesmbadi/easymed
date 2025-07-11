provider "aws" {
  region     = "us-east-1"
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

data "terraform_remote_state" "persistent" {
  backend = "local"
  config = {
    path = "../persistent/terraform.tfstate"
  }
}

resource "aws_lightsail_disk_attachment" "postgres" {
  disk_name     = data.terraform_remote_state.persistent.outputs.postgres_disk_name
  instance_name = aws_lightsail_instance.app_server.name

  disk_path     = "/dev/xvdf"  # Must match what you mount in init.sh

  depends_on = [
    aws_lightsail_instance.app_server
  ]
}


resource "aws_lightsail_key_pair" "github_actions_key" {
  name       = "github-actions-key"
  public_key = file("~/.ssh/github-actions.pub")
}

resource "aws_lightsail_instance" "app_server" {
  name              = "my-app-server"
  availability_zone = "us-east-1a"
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = "micro_2_0"
  key_pair_name     = "github-actions-key"
  user_data         = file("./init.sh")

  provisioner "file" {
    source      = "/home/mbadi/Desktop/personal/easymed/.env"
    destination = "/home/ubuntu/.env"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/github-actions")
      host        = self.public_ip_address
    }
  }

  provisioner "remote-exec" {
    inline = [
      "chown ubuntu:ubuntu /home/ubuntu/.env",
      "ls -la /home/ubuntu"
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/github-actions")
      host        = self.public_ip_address
    }
  }
}


resource "aws_lightsail_static_ip" "static_ip" {
  name = "my-static-ip"
}

resource "aws_lightsail_static_ip_attachment" "static_ip_attach" {
  static_ip_name = aws_lightsail_static_ip.static_ip.name
  instance_name  = aws_lightsail_instance.app_server.name
}

# Open required ports in Lightsail firewall
resource "aws_lightsail_instance_public_ports" "app_ports" {
  instance_name = aws_lightsail_instance.app_server.name

  port_info {
    protocol   = "tcp"
    from_port  = 8080
    to_port    = 8080
  }
  port_info {
    protocol   = "tcp"
    from_port  = 3000
    to_port    = 3000
  }
  port_info {
    protocol   = "tcp"
    from_port  = 80
    to_port    = 80
  }
  port_info {
    protocol   = "tcp"
    from_port  = 9090
    to_port    = 9090
  }
  port_info {
    protocol   = "tcp"
    from_port  = 9091
    to_port    = 9091
  }
}
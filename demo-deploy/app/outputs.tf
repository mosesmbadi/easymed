output "lightsail_ip" {
  description = "Public IP of the Lightsail instance"
  value       = aws_lightsail_static_ip.static_ip.ip_address
}
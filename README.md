# tezland-backend


UFW & Docker setup. See: https://github.com/chaifeng/ufw-docker

Then apply these rules:


sudo ufw route allow proto tcp from any to any port 80 &&
sudo ufw route allow proto tcp from any to any port 443 &&
sudo ufw route allow proto tcp from any to any port 4001 &&
sudo ufw route allow proto udp from any to any port 4001

sudo ufw route deny to 10.0.0.0/8 &&
sudo ufw route deny to 100.64.0.0/10 &&
sudo ufw route deny to 169.254.0.0/16 &&
sudo ufw route deny to 172.16.0.0/12 && # NOTE: this is where the docker network is on, prob makes sense not to block this
sudo ufw route deny to 192.168.0.0/16


However, it does not seem to work very well. This seems works quite well:
From: https://blog.nuvotex.de/docker-hardening-with-firewalld/
> firewalld-setup.sh

# create required chains
# ensure to create DOCKER-USER chain
# create also reject & allow chains
firewall-cmd --permanent --direct --add-chain ipv4 filter DOCKER-USER
firewall-cmd --permanent --direct --add-chain ipv4 filter DOCKER-USER-DENY-INTERNAL
firewall-cmd --permanent --direct --add-chain ipv4 filter DOCKER-USER-DROP
firewall-cmd --permanent --direct --add-chain ipv6 filter DOCKER-USER
firewall-cmd --permanent --direct --add-chain ipv6 filter DOCKER-USER-DENY-INTERNAL
firewall-cmd --permanent --direct --add-chain ipv6 filter DOCKER-USER-DROP
 
# prepare log & drop chain
firewall-cmd --permanent --direct --add-rule ipv4 filter DOCKER-USER-DROP 64 -m hashlimit --hashlimit-mode srcip,dstip,dstport --hashlimit-name docker_drop --hashlimit-upto 6/min -j LOG --log-prefix "DOCKER_NET_DROP "
firewall-cmd --permanent --direct --add-rule ipv4 filter DOCKER-USER-DROP 128 -j DROP
firewall-cmd --permanent --direct --add-rule ipv6 filter DOCKER-USER-DROP 64 -m hashlimit --hashlimit-mode srcip,dstip,dstport --hashlimit-name docker_drop --hashlimit-upto 6/min -j LOG --log-prefix "DOCKER_NET_DROP "
firewall-cmd --permanent --direct --add-rule ipv6 filter DOCKER-USER-DROP 128 -j DROP
 
# add redirects to internal chains
firewall-cmd --permanent --direct --add-rule ipv4 filter DOCKER-USER 4096 -o lo -j DOCKER-USER-DENY-INTERNAL
firewall-cmd --permanent --direct --add-rule ipv4 filter DOCKER-USER 4096 -o eth+ -j DOCKER-USER-DENY-INTERNAL
firewall-cmd --permanent --direct --add-rule ipv6 filter DOCKER-USER 4096 -o lo -j DOCKER-USER-DENY-INTERNAL
firewall-cmd --permanent --direct --add-rule ipv6 filter DOCKER-USER 4096 -o eth+ -j DOCKER-USER-DENY-INTERNAL
 
# add default rules that deny traffic to all internal interfaces
firewall-cmd --permanent --direct --add-rule ipv4 filter DOCKER-USER-DENY-INTERNAL 64 -d 10.0.0.0/8 -j DOCKER-USER-DROP
firewall-cmd --permanent --direct --add-rule ipv4 filter DOCKER-USER-DENY-INTERNAL 64 -d 100.64.0.0/10 -j DOCKER-USER-DROP
firewall-cmd --permanent --direct --add-rule ipv4 filter DOCKER-USER-DENY-INTERNAL 64 -d 127.0.0.0/8 -j DOCKER-USER-DROP
firewall-cmd --permanent --direct --add-rule ipv4 filter DOCKER-USER-DENY-INTERNAL 64 -d 169.254.0.0/16 -j DOCKER-USER-DROP
# firewall-cmd --permanent --direct --add-rule ipv4 filter DOCKER-USER-DENY-INTERNAL 64 -d 172.16.0.0/12 -j DOCKER-USER-DROP
firewall-cmd --permanent --direct --add-rule ipv4 filter DOCKER-USER-DENY-INTERNAL 64 -d 192.168.0.0/16 -j DOCKER-USER-DROP
firewall-cmd --permanent --direct --add-rule ipv4 filter DOCKER-USER-DENY-INTERNAL 64 -d 224.0.0.0/4 -j DOCKER-USER-DROP
firewall-cmd --permanent --direct --add-rule ipv6 filter DOCKER-USER-DENY-INTERNAL 64 -d fe80::/10 -j DOCKER-USER-DROP
firewall-cmd --permanent --direct --add-rule ipv6 filter DOCKER-USER-DENY-INTERNAL 64 -d fc00::/7 -j DOCKER-USER-DROP
firewall-cmd --permanent --direct --add-rule ipv6 filter DOCKER-USER-DENY-INTERNAL 64 -d ff00::/8 -j DOCKER-USER-DROP
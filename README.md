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
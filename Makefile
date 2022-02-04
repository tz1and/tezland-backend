docker-build:
	docker-compose -f docker-compose.backend.yml build

docker-up:
	docker-compose -f docker-compose.backend.yml up -d

docker-down:
	docker-compose -f docker-compose.backend.yml down -v

docker-push:
	docker save -o tezland-backend-latest.tar tezland-backend:latest
	rsync tezland-backend-latest.tar docker-compose.backend.yml nginx.conf tz1and.com:/home/yves/docker
	ssh tz1and.com "source .profile; cd docker; docker load -i tezland-backend-latest.tar; mv nginx.conf nginx/conf/backend.conf"
#	; rm tezland-backend-latest.tar"
	rm tezland-backend-latest.tar
# mybe docker clean images or whatever

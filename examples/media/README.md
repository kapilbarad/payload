# Payload Blank Template

## Development

To spin up the project locally, follow these steps:

1. First clone the repo
1. Then `cd YOUR_PROJECT_REPO && cp .env.example .env`
1. Then `docker-compose up`, spins up mongodb in docker
1. Next `npm i && npm run dev`
1. Now Open [http://localhost:3000/admin](http://localhost:3000/admin)  to access the admin panel
1. Create your first admin user using the form on the page

That's it! Changes made in `./src` will be reflected in your app.
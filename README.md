
# Marginal – Three-Tier Blog Application

A production-oriented three-tier blog application built with React, Node.js, Express, and MySQL.

**Current Status:** Local Docker Compose deployment successfully completed and tested.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Nginx |
| Backend | Node.js, Express |
| Database | MySQL 8.4 |
| Containerization | Docker, Docker Compose |
| Source Control | Git, GitHub |

## Architecture

Browser → Nginx Frontend → Node.js Backend → MySQL Database

## Application Features

- User registration and authentication
- JWT-based authentication
- Blog post listing and details
- Create blog posts
- Add comments
- MySQL persistent storage
- Backend readiness endpoint
- Prometheus metrics endpoint

## Repository Structure

```text
Guvi-Project-4/
├── backend/
│   ├── src/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── default.conf.template
│   └── package.json
├── database/
│   └── init.sql
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Local Deployment

### Prerequisites

- Docker Desktop
- Docker Compose

### 1. Clone repository

```bash
git clone https://github.com/naviktg/Guvi-Project-4.git
cd Guvi-Project-4
```

### 2. Configure environment

Create a local `.env` file with the required database and JWT environment variables.

Do not commit `.env` or real credentials to GitHub.

### 3. Validate configuration

```bash
docker compose config --quiet
```

### 4. Build Docker images

```bash
docker compose build
```

### 5. Start application

```bash
docker compose up -d
```

### 6. Verify containers

```bash
docker compose ps
```

### 7. Access application

Frontend: http://localhost:8080

## Testing Completed

The following functionality has been tested locally:

- Frontend application loading
- Backend and MySQL connectivity
- User registration and login
- Blog post creation and listing
- Blog post detail page
- Comment creation
- MySQL health checks
- Backend readiness checks
- Docker container recreation
- Database persistence using a named Docker volume

## Database Persistence

MySQL data is stored in the Docker named volume `mysql_data`.

Stop containers:

```bash
docker compose stop
```

Start containers:

```bash
docker compose up -d
```

Remove containers and network while retaining database data:

```bash
docker compose down
```

Do not use `docker compose down -v` unless you intentionally want to delete database data.

## Planned Project Implementation

The following Project 4 requirements are pending implementation:

- Jenkins CI/CD pipeline
- SonarQube code analysis and Quality Gate
- Trivy vulnerability scanning
- Nexus Repository / Amazon ECR
- Kubernetes manifests and configuration
- Amazon EKS deployment
- Rolling updates and deployment validation
- Prometheus and Grafana monitoring

These components will be documented as they are implemented and verified.

## Author

GUVI DevOps Project – Project 04

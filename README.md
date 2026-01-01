# Smart Paper Analysis Frontend

Frontend for **SARAG (Section-Aware Retrieval-Augmented Generation)** system, a hybrid neuro-symbolic approach for scholarly knowledge extraction from scientific papers.

This project extends the [ORKG Frontend](https://gitlab.com/TIBHannover/orkg/orkg-frontend) with a Smart Paper Analysis feature that provides a five-stage pipeline for research article annotation.

[![Node.js 16+](https://img.shields.io/badge/node-16+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

### Smart Paper Analysis (`/paper-analysis`)

A five-stage pipeline for research article annotation:

1. **Metadata Extraction**: Extract bibliographic information from papers
2. **Research Field Detection**: Identify research fields using taxonomy-aligned corpus
3. **Research Problem Identification**: Find similar problems via ORKG + LLM embeddings
4. **Template Selection/Generation**: Select ORKG templates or generate via LLM
5. **Content Extraction**: Extract section-based content with evidence tracking

### Additional Features

- **Data Tracking**: Track all extraction steps and user interactions
- **GitHub Integration**: Save evaluation data directly to GitHub repository
- **Hybrid Neuro-Symbolic**: Automatic LLM fallback when ORKG data is unavailable

## Installation

### Prerequisites

- Node.js >= 16.0.0 ([Download](https://nodejs.org/en/download/))
- [Smart Paper Analysis Backend](https://github.com/Webo1980/smart-paper-analysis-backend) running locally

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Webo1980/smart-paper-analysis-frontend.git
   cd smart-paper-analysis-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy the default environment file:
   ```bash
   cp default.env .env
   ```

4. **Add Smart Paper Analysis configuration**
   
   Add the following to your `.env` file:
   ```env
   # Smart Paper Analysis API (Backend)
   NEXT_PUBLIC_PAPER_ANALYSIS_API=http://localhost:8000/api/v2
   
   # LLM Configuration (Mistral)
   NEXT_PUBLIC_MODEL_NAME=mistral-medium
   NEXT_PUBLIC_API_KEY=your_mistral_api_key
   NEXT_PUBLIC_LLM_TEMPERATURE=0.7
   
   # GitHub Integration (for evaluation data storage)
   NEXT_PUBLIC_GITHUB_TOKEN=your_github_token
   NEXT_PUBLIC_GITHUB_OWNER=your_github_username
   NEXT_PUBLIC_GITHUB_REPO=your_evaluation_repo
   ```

### Getting API Keys

| Service | How to Get |
|---------|------------|
| Mistral API | Sign up at [console.mistral.ai](https://console.mistral.ai/) |
| GitHub Token | Create at [github.com/settings/tokens](https://github.com/settings/tokens) with `repo` scope |

## Running

### Start the Backend First

Ensure the [Smart Paper Analysis Backend](https://github.com/Webo1980/smart-paper-analysis-backend) is running:

```bash
# In the backend directory
python -m src.main
```

### Start the Frontend

```bash
npm run dev
```

Open your browser at: **http://localhost:3000/paper-analysis**

### Running with Docker

```bash
cp default.env .env
# Edit .env with your configuration
docker-compose up -d
```

## Project Structure

```
smart-paper-analysis-frontend/
├── src/
│   └── app/
│       └── paper-analysis/      # Smart Paper Analysis feature
│           ├── components/      # UI components
│           ├── hooks/           # Custom React hooks
│           ├── services/        # API integration
│           └── page.tsx         # Main page
├── default.env                  # Default environment template
├── .env                         # Your configuration (not in repo)
└── ...                          # Other ORKG frontend files
```

## Configuration Reference

### Smart Paper Analysis Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PAPER_ANALYSIS_API` | ✅ | Backend API endpoint |
| `NEXT_PUBLIC_MODEL_NAME` | ✅ | LLM model name (e.g., `mistral-medium`) |
| `NEXT_PUBLIC_API_KEY` | ✅ | Mistral API key |
| `NEXT_PUBLIC_LLM_TEMPERATURE` | Optional | LLM temperature (default: 0.7) |
| `NEXT_PUBLIC_GITHUB_TOKEN` | Optional | GitHub token for data storage |
| `NEXT_PUBLIC_GITHUB_OWNER` | Optional | GitHub repository owner |
| `NEXT_PUBLIC_GITHUB_REPO` | Optional | GitHub repository name |

### ORKG Variables

For ORKG-specific configuration, refer to the [ORKG Frontend Wiki](https://gitlab.com/TIBHannover/orkg/orkg-frontend/-/wikis/home).

Key variables:
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | ORKG backend endpoint |
| `NEXT_PUBLIC_SIMILARITY_SERVICE_URL` | ORKG similarity service |
| `NEXT_PUBLIC_NLP_SERVICE_URL` | ORKG NLP service |

## Usage

1. Navigate to **http://localhost:3000/paper-analysis**
2. Enter a paper URL or DOI
3. Follow the five-stage pipeline:
   - Review and edit metadata
   - Select or confirm research field
   - Choose or generate research problem
   - Select or generate template
   - Review extracted content with evidence highlights
4. Save results to ORKG or export data

## Related Projects

| Project | Description |
|---------|-------------|
| [smart-paper-analysis-backend](https://github.com/Webo1980/smart-paper-analysis-backend) | Backend API for SARAG system |
| [smart-paper-analysis-extension](https://github.com/Webo1980/smart-paper-analysis-extension) | Chrome extension (ORKGEx 2.0) |
| [smart-paper-analysis-evaluation](https://github.com/Webo1980/smart-paper-analysis-evaluation) | Evaluation dashboard |

## Based on ORKG Frontend

This project is built on top of the [ORKG Frontend](https://gitlab.com/TIBHannover/orkg/orkg-frontend). For detailed ORKG documentation:

- [ORKG Frontend Repository](https://gitlab.com/TIBHannover/orkg/orkg-frontend)
- [ORKG Frontend Wiki](https://gitlab.com/TIBHannover/orkg/orkg-frontend/-/wikis/home)
- [ORKG Live](https://orkg.org)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Open Research Knowledge Graph (ORKG)](https://orkg.org/)
- [TIB Leibniz Information Centre for Science and Technology](https://www.tib.eu/)
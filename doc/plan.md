# Intial Plan and Overview

This is going to be an note taking application that saves all info to a vector database for easy info access and information searching.

## Tools
Nestjs
Chroma DB

## Setup
`nest new .` //chose npm
`npm install chromadb @chroma-core/default-embed`

//this runs the chroma backend
`npx chroma run --path ./getting-started` //NOTE: Doesnt work on windows x64

### Alternative
I am going to use docker for this project which will allow chromaDB to run on a linux instance while improving my docker


# ChromaDB
https://docs.trychroma.com/docs/overview/getting-started#typescript

```
docker pull chromadb/chroma
docker run -p 8000:8000 chromadb/chroma
```

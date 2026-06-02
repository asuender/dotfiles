# Docker Guidelines

- For sensitive information, prefer **secrets** over environment variables.
- For EVERY required environment variable found in compose files, use the following interpolation syntax:

```Dockerfile
# Required value
${VAR:?error}
```

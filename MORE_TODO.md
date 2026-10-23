# Asynchronous analysis
- user submits an analysis request to the /api/analyze endpoint
- if accepted it will return a job-id for the analysis
- user will poll until the job is finished and backend will return new puzzles

# Finding most recent un-analyzed games
- before searching for most recent ten games
- user requests list of already analyzed games
- then find the 10 most recent un-analyzed games
- must use chess.coms native game uuids and not a newly locally generated one


export let signup = async () => {
    const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    })
    const data = await res.json()
    return data
}

export let login = async () => {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    })
    const data = await res.json()
    return data
}
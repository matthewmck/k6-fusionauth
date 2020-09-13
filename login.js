import http from 'k6/http'
import { sleep, check } from 'k6'
import { Counter } from "k6/metrics"
import config from "./config.js"

let users = 2
let createdUser = new Counter("created_user")
let loggedIn = new Counter("users_logged_in")
let existingUser = new Counter("existing_user")

export const options = { vus: users, iterations: users }

export function setup() {
    for (let i = 1; i <= users; i++) {
        const url = 'https://auth.scaddev.com/api/user/registration/'
        let headers = {
            'Content-Type': 'application/json',
            'Authorization': config.API_KEY
        }
        let data = {
            registration: { applicationId: config.APP_ID },
            user: {
                username: i,
                password: "password"
            }
        }

        let res = http.post(url, JSON.stringify(data), { headers: headers })
        if (res.status === 200) createdUser.add(1)
        if (res.status === 400) existingUser.add(1)
    }
}

export default function () {
    const url = 'https://auth.scaddev.com/api/login'
    let headers = {
        'Content-Type': 'application/json',
        'X-FusionAuth-TenantId': config.TENANT_ID,
        'Authorization': config.API_KEY
    }
    let data = {
        applicationId: config.APP_ID,
        loginId: __VU,
        password: "password"
    }

    let res = http.post(url, JSON.stringify(data), { headers: headers })
    check(res, { 'is status 200': r => r.status === 200 })
    if (res.status === 200) loggedIn.add(1)
    if (res.status === 400) existingUser.add(1)
    sleep(1)
}

export function teardown() {
    for (let i = 1; i <= users; i++) {
        const getUrl = `https://auth.scaddev.com/api/user?username=${i}`
        let headers = {
            'Content-Type': 'application/json',
            'X-FusionAuth-TenantId': config.TENANT_ID,
            'Authorization': config.API_KEY
        }
        let data = {}

        let getRes = http.request('GET', getUrl, JSON.stringify(data), { headers: headers })
        let userId = JSON.parse(getRes.body).user.id
        const delUrl = `https://auth.scaddev.com/api/user/${userId}?hardDelete=true`
        http.del(delUrl, JSON.stringify(data), { headers: headers })
    }
}
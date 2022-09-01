from time import sleep
from stable_diffusion import run_stable_diffusion
import requests

server = 'http://localhost:5000'
token = 'testing-upload-token'

while True:
    sleep(0.5)
    next_prompt_res = requests.get(f"{server}/next_prompt?token={token}")

    if next_prompt_res.status_code == 404:
        continue

    next_prompt = next_prompt_res.json()

    print(next_prompt)

    res = requests.put(
        f"{server}/prompt/{next_prompt['id']}?token={token}", json={"being_generated": True, "generated_percent": 0})
    if res.status_code == 400:
        continue

    print(res.json())

    print("Running model")

    run_stable_diffusion(
        next_prompt["prompt_text"], next_prompt["iterations"], next_prompt["seed"], "upload.png", server, token, next_prompt)

    print("Ran model")

    requests.post(f"{server}/upload/{next_prompt['id']}?token={token}", files={
        'result': open('upload.png', 'rb')})

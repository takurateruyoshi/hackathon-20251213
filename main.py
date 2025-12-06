from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates

app = FastAPI()
# 指定したいファイルを配置するディレクトリを設定
templates = Jinja2Templates(directory="templates")


@app.get("/")
async def index(name: str, request: Request):
    # テンプレートに変数を渡してレンダリング
    return templates.TemplateResponse("index.html", {
        # 内部で使用する変数を指定
        "name": name,
        "request": request
    })
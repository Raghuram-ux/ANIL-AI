import asyncio

def sync_func():
    return {"status": "ok"}

async def main():
    try:
        res = await sync_func()
        print(res)
    except TypeError as e:
        print(f"Caught expected error: {e}")

if __name__ == "__main__":
    asyncio.run(main())

import hashlib
import hmac

def user_telegram_verification(data, bot_token):
    hash = ""
    if not data['hash']:
        return False

    hash = data['hash']

    data.pop('hash')
    items = data.items()
    items = sorted(items)

    strings = []
    for key, value in items:
        strings.append(f"{key}={value}")

    temp = '\n'.join(strings)

    code = hashlib.sha256(bot_token.encode()).digest()
    hash_code = temp.encode()
    signature = hmac.new(code, hash_code, digestmod=hashlib.sha256).hexdigest()

    if signature == hash:
        return True
    else:
        return False



print(user_telegram_verification({"name": "aaa", "hash": "aaaa"}, "ddddddddddddd"))
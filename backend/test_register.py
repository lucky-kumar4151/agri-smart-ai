import sys, os, traceback
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

try:
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    r = client.post('/api/auth/register', json={
        'name':'Test','email':'test@test.com','password':'test123456',
        'phone':'1234','role':'farmer','language':'en',
        'location':{'state':'','district':'','city':''},
        'farm_details':{'farm_size':'','farm_size_unit':'acres','crops':[],'soil_type':'','irrigation_type':''}
    })
    print(f"STATUS: {r.status_code}")
    print(f"BODY: {r.text}")
except Exception as e:
    traceback.print_exc()

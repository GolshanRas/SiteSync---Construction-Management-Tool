
from App import app

client = app.test_client()

project_id = 1
headers = {"X-User-Role": "Project Manager"}

# 1. Update project budget to $50,000
response = client.put(
    f"/api/projects/{project_id}/budget",
    headers=headers,
    json={"budget": "50000.00"}
)

print("PUT budget:", response.status_code, response.get_json())
assert response.status_code == 200

# 2. Retrieve cost overview
response = client.get(
    f"/api/projects/{project_id}/costs",
    headers=headers
)

print("GET costs:", response.status_code, response.get_json())
assert response.status_code == 200

overview = response.get_json()

assert overview["budget_cents"] == 5000000

# 3. Add a $1,250 expense
response = client.post(
    f"/api/projects/{project_id}/expenses",
    headers=headers,
    json={
        "category": "Materials",
        "description": "Concrete and supplies",
        "amount": "1250.00",
        "expense_date": "2026-11-02"
    }
)

print("POST expense:", response.status_code, response.get_json())
assert response.status_code == 201

expense_id = response.get_json()["id"]

try:
    # 4. Check that spending increases
    response = client.get(
        f"/api/projects/{project_id}/costs",
        headers=headers
    )

    print("GET updated costs:", response.status_code, response.get_json())
    assert response.status_code == 200

    updated = response.get_json()

    assert updated["spent_cents"] == overview["spent_cents"] + 125000
    assert updated["remaining_cents"] == overview["remaining_cents"] - 125000

finally:
    # 5. Remove the test expense
    response = client.delete(
        f"/api/projects/{project_id}/expenses/{expense_id}",
        headers=headers
    )

    print("DELETE expense:", response.status_code, response.get_json())
    assert response.status_code == 200

print("All cost overview tests passed!")

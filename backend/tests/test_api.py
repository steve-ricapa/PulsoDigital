import pytest
from httpx import AsyncClient


class TestAuth:
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, auth_headers_psychologist: dict):
        # This test would need a proper login endpoint
        pass

    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/login", json={
            "email": "wrong@test.edu",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestSurveys:
    @pytest.mark.asyncio
    async def test_get_current_survey(self, client: AsyncClient, auth_headers_student: dict, test_survey, test_student):
        response = await client.get("/api/v1/surveys/current", headers=auth_headers_student)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "questions" in data

    @pytest.mark.asyncio
    async def test_get_survey_unauthorized(self, client: AsyncClient):
        response = await client.get("/api/v1/surveys/current")
        assert response.status_code == 401


class TestResponses:
    @pytest.mark.asyncio
    async def test_submit_responses(self, client: AsyncClient, auth_headers_student: dict, test_survey, test_questions, test_student):
        responses = [
            {"question_id": str(test_questions[0].id), "survey_id": str(test_survey.id), "value_numeric": 4},
            {"question_id": str(test_questions[1].id), "survey_id": str(test_survey.id), "value_numeric": 8},
            {"question_id": str(test_questions[2].id), "survey_id": str(test_survey.id), "value_numeric": 3},
            {"question_id": str(test_questions[3].id), "survey_id": str(test_survey.id), "value_text": "Todo bien"},
        ]
        
        response = await client.post(
            "/api/v1/responses/bulk",
            json={"responses": responses},
            headers=auth_headers_student
        )
        assert response.status_code == 201
        assert len(response.json()) == 4

    @pytest.mark.asyncio
    async def test_submit_duplicate_responses(self, client: AsyncClient, auth_headers_student: dict, test_survey, test_questions, test_student):
        responses = [
            {"question_id": str(test_questions[0].id), "survey_id": str(test_survey.id), "value_numeric": 4},
        ]
        
        await client.post("/api/v1/responses/bulk", json={"responses": responses}, headers=auth_headers_student)
        
        response = await client.post(
            "/api/v1/responses/bulk",
            json={"responses": responses},
            headers=auth_headers_student
        )
        assert response.status_code == 409


class TestWellbeing:
    @pytest.mark.asyncio
    async def test_calculate_wellbeing(self, client: AsyncClient, auth_headers_psychologist: dict, test_student, test_survey):
        response = await client.post(
            f"/api/v1/wellbeing/calculate/{test_student.id}/{test_survey.id}",
            headers=auth_headers_psychologist
        )
        assert response.status_code == 200
        data = response.json()
        assert "overall_score" in data
        assert "risk_level" in data
        assert 0 <= data["overall_score"] <= 1

    @pytest.mark.asyncio
    async def test_get_student_wellbeing(self, client: AsyncClient, auth_headers_student: dict, test_student, test_survey):
        response = await client.get(
            f"/api/v1/wellbeing/student/{test_student.id}/{test_survey.id}",
            headers=auth_headers_student
        )
        # Might be 404 if not calculated yet
        assert response.status_code in [200, 404]


class TestDashboard:
    @pytest.mark.asyncio
    async def test_psychologist_dashboard(self, client: AsyncClient, auth_headers_psychologist: dict):
        response = await client.get("/api/v1/dashboard/psychologist", headers=auth_headers_psychologist)
        assert response.status_code == 200
        data = response.json()
        assert "assigned_classrooms" in data
        assert "priority_students" in data

    @pytest.mark.asyncio
    async def test_school_overview(self, client: AsyncClient, auth_headers_psychologist: dict, test_school):
        response = await client.get(
            f"/api/v1/dashboard/school-overview?school_id={test_school.id}",
            headers=auth_headers_psychologist
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_student_trend(self, client: AsyncClient, auth_headers_psychologist: dict, test_student):
        response = await client.get(
            f"/api/v1/dashboard/students/{test_student.id}/trend",
            headers=auth_headers_psychologist
        )
        assert response.status_code == 200
        data = response.json()
        assert "wellbeing_trend" in data
        assert "support_requests" in data
        assert "interventions" in data


class TestRisk:
    @pytest.mark.asyncio
    async def test_get_alerts(self, client: AsyncClient, auth_headers_psychologist: dict):
        response = await client.get("/api/v1/risk/alerts", headers=auth_headers_psychologist)
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data


class TestInterventions:
    @pytest.mark.asyncio
    async def test_create_intervention(self, client: AsyncClient, auth_headers_psychologist: dict, test_student):
        response = await client.post(
            "/api/v1/interventions",
            json={
                "student_id": str(test_student.id),
                "intervention_type": "contact_made",
                "description": "Llamada a padres para coordinar reunión",
            },
            headers=auth_headers_psychologist
        )
        assert response.status_code == 201
        data = response.json()
        assert data["intervention_type"] == "contact_made"

    @pytest.mark.asyncio
    async def test_list_interventions(self, client: AsyncClient, auth_headers_psychologist: dict):
        response = await client.get("/api/v1/interventions", headers=auth_headers_psychologist)
        assert response.status_code == 200
        data = response.json()
        assert "interventions" in data
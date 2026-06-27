import { ACADEMIC_API_URL } from "../config/api";

function authHeaders(extraHeaders = {}) {
  const token = localStorage.getItem("auth_token");
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export async function fetchAcademicModules() {
  const response = await fetch(`${ACADEMIC_API_URL}/modules`, {
    headers: authHeaders()
  });

  return parseResponse(response);
}

export async function uploadTranscript(file) {
  const formData = new FormData();
  formData.append("transcript", file);

  const response = await fetch(`${ACADEMIC_API_URL}/transcript/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData
  });

  return parseResponse(response);
}

export async function uploadCurriculum(file) {
  const formData = new FormData();
  formData.append("curriculum", file);

  const response = await fetch(`${ACADEMIC_API_URL}/curriculum/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData
  });

  return parseResponse(response);
}

export async function uploadGpaMapping(file) {
  const formData = new FormData();
  formData.append("mapping", file);

  const response = await fetch(`${ACADEMIC_API_URL}/gpa-buckets/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData
  });

  return parseResponse(response);
}

export async function predictGpaBuckets() {
  const response = await fetch(`${ACADEMIC_API_URL}/gpa-buckets/predict`, {
    method: "POST",
    headers: authHeaders()
  });

  return parseResponse(response);
}

export async function addAcademicModule(moduleData) {
  const response = await fetch(`${ACADEMIC_API_URL}/modules`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(moduleData)
  });

  return parseResponse(response);
}

export async function updateAcademicModule(moduleData) {
  if (!moduleData._id) {
    return addAcademicModule(moduleData);
  }

  const response = await fetch(`${ACADEMIC_API_URL}/modules/${moduleData._id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(moduleData)
  });

  return parseResponse(response);
}

export async function deleteAcademicModule(moduleId) {
  const response = await fetch(`${ACADEMIC_API_URL}/modules/${moduleId}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  return parseResponse(response);
}

export async function clearAcademicModules() {
  const response = await fetch(`${ACADEMIC_API_URL}/modules`, {
    method: "DELETE",
    headers: authHeaders()
  });

  return parseResponse(response);
}

export async function buildGradePlan(desiredGpa) {
  const response = await fetch(`${ACADEMIC_API_URL}/plan`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ desiredGpa })
  });

  return parseResponse(response);
}

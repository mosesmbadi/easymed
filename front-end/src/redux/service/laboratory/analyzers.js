import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";

// The analyzer interface: the inbox of results the LIS server could not
// place, and each analyzer's code-to-test-panel mappings.

const errorMessage = (err) => {
    const data = err.response?.data;
    if (data && typeof data === "object") {
        const first = data.detail || data.error_message || Object.values(data).flat()[0];
        if (first) return String(first);
    }
    return err.message;
};

const call = (auth, config) =>
    UseAxios(auth)
        .request(config)
        .then((res) => res.data)
        .catch((err) => Promise.reject(errorMessage(err)));

// ------------------------------------------------------------------ inbox

export const fetchAnalyzerResults = (auth, params = {}) =>
    call(auth, { method: "get", url: `${APP_API_URL.ANALYZER_RESULTS}`, params });

export const fetchAnalyzerInboxSummary = (auth) =>
    call(auth, { method: "get", url: `${APP_API_URL.ANALYZER_RESULTS}/summary` });

export const retryAnalyzerResult = (auth, resultId) =>
    call(auth, { method: "post", url: `${APP_API_URL.ANALYZER_RESULTS}/${resultId}/retry` });

export const ignoreAnalyzerResult = (auth, resultId) =>
    call(auth, { method: "post", url: `${APP_API_URL.ANALYZER_RESULTS}/${resultId}/ignore` });

export const retryAllAnalyzerResults = (auth) =>
    call(auth, { method: "post", url: `${APP_API_URL.ANALYZER_RESULTS}/retry-open` });

export const fetchAnalyzerMessage = (auth, messageId) =>
    call(auth, { method: "get", url: `${APP_API_URL.ANALYZER_MESSAGES}/${messageId}` });

export const assignAnalyzerSample = (auth, messageId, sampleCode) =>
    call(auth, {
        method: "post",
        url: `${APP_API_URL.ANALYZER_MESSAGES}/${messageId}/assign-sample`,
        data: { sample_code: sampleCode },
    });

// --------------------------------------------------------------- mappings

export const fetchAnalyzerMappings = (auth, equipmentId) =>
    call(auth, { method: "get", url: `${APP_API_URL.ANALYZER_TEST_MAPPINGS}`, params: { equipment: equipmentId } });

export const fetchUnmappedAnalyzerCodes = (auth, equipmentId) =>
    call(auth, {
        method: "get",
        url: `${APP_API_URL.ANALYZER_TEST_MAPPINGS}/unmapped-codes`,
        params: { equipment: equipmentId },
    });

// test_panel null means "don't import this code".
export const createAnalyzerMapping = (auth, payload) =>
    call(auth, { method: "post", url: `${APP_API_URL.ANALYZER_TEST_MAPPINGS}`, data: payload });

export const updateAnalyzerMapping = (auth, mappingId, payload) =>
    call(auth, { method: "patch", url: `${APP_API_URL.ANALYZER_TEST_MAPPINGS}/${mappingId}`, data: payload });

export const deleteAnalyzerMapping = (auth, mappingId) =>
    call(auth, { method: "delete", url: `${APP_API_URL.ANALYZER_TEST_MAPPINGS}/${mappingId}` });

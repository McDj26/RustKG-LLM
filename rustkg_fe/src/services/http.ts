import axios, { type AxiosInstance } from "axios";

class HTTPService {
  core: AxiosInstance;

  constructor() {
    this.core = axios.create({
      baseURL: import.meta.env.VITE_BACKEND_URL,
    });
    this.core.interceptors.response.use(
      (response) => response,
      (error) => {
        alert(error.message);
        return Promise.resolve({});
      }
    );
  }

  get<T = any>(url: string) {
    return this.core.get<T>(url);
  }

  post<T = any>(url: string, data: any) {
    return this.core.post<T>(url, data);
  }

  getStream<T = any>(url: string) {
    return this.core.get<T>(url, { responseType: "stream" });
  }
}

const http = new HTTPService();

export default http;

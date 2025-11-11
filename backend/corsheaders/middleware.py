from django.http import HttpResponse


class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.allow_origin = "*"
        self.allow_methods = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        self.allow_headers = "Content-Type, Authorization"
        self.allow_credentials = "true"

    def _add_cors_headers(self, response):
        response.setdefault("Access-Control-Allow-Origin", self.allow_origin)
        response.setdefault("Access-Control-Allow-Methods", self.allow_methods)
        response.setdefault("Access-Control-Allow-Headers", self.allow_headers)
        if self.allow_credentials:
            response.setdefault(
                "Access-Control-Allow-Credentials", self.allow_credentials
            )
        return response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse(status=200)
        else:
            response = self.get_response(request)

        return self._add_cors_headers(response)
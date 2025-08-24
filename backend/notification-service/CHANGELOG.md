# Changelog

## [2.0.0](https://github.com/Tadayoshi123/SupervIA/compare/notification-service-v1.2.0...notification-service-v2.0.0) (2025-08-24)


### ⚠ BREAKING CHANGES

* **notifications:** Alert system now uses batch processing by default. Previously individual emails were sent per alert, now alerts are collected for 30 seconds and sent as a single comprehensive report.

### Features

* **notifications:** implement intelligent alert batching system ([31dff38](https://github.com/Tadayoshi123/SupervIA/commit/31dff387dc90ad74fd5a896a1783705f73bd7973))

## [1.2.0](https://github.com/Tadayoshi123/SupervIA/compare/notification-service-v1.1.0...notification-service-v1.2.0) (2025-08-23)


### Features

* add comprehensive JSDoc documentation and improve code consistency ([9cd2d84](https://github.com/Tadayoshi123/SupervIA/commit/9cd2d84369aad2ae92e03492109bb436d890c7b2))

## [1.1.0](https://github.com/Tadayoshi123/SupervIA/compare/notification-service-v1.0.0...notification-service-v1.1.0) (2025-08-23)


### Features

* :art: added unit test coverage for backend, upgraded dashboard editor, alerts and notifications in frontend ([f6f9a76](https://github.com/Tadayoshi123/SupervIA/commit/f6f9a76191d06a9762714f6d86227c8a65451278))
* :sparkles: Massive frontend rework, security updates and ci modification ([606655f](https://github.com/Tadayoshi123/SupervIA/commit/606655f3b9595cdccdcb1bf00c2c2ee37da84c28))
* :tada: Start of SupervIA ([959675a](https://github.com/Tadayoshi123/SupervIA/commit/959675a2a53ae25f89d843e4cdc18526896f2fc1))

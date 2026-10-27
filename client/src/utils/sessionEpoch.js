export class SessionEpoch {
    version = 0;
    controllers = new Set();

    beginRequest() {
        const controller = new AbortController();
        const version = this.version;
        this.controllers.add(controller);
        return {
            version,
            signal: controller.signal,
            finish: () => this.controllers.delete(controller),
        };
    }

    advance() {
        this.version += 1;
        for (const controller of this.controllers) controller.abort();
        this.controllers.clear();
        return this.version;
    }

    isCurrent(version) {
        return version === this.version;
    }
}

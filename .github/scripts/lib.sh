#!/usr/bin/env bash

POOL_BRANCH="${POOL_BRANCH:-gh-pages}"
POOL_CHECKOUT="${POOL_CHECKOUT:-published}"

pages_base_url() {
    if [ -n "${PAGES_BASE_URL:-}" ]; then
        printf '%s' "${PAGES_BASE_URL%/}"
        return
    fi

    local owner="${GITHUB_REPOSITORY%%/*}"
    local repo="${GITHUB_REPOSITORY#*/}"
    owner="${owner,,}"

    local base="https://${owner}.github.io"
    [ "$repo" = "${owner}.github.io" ] || base="${base}/${repo}"

    printf '%s' "$base"
}

commit_pool() {
    if git -C "$POOL_CHECKOUT" diff --cached --quiet; then
        echo "$1"
        return 0
    fi

    git -C "$POOL_CHECKOUT" commit -m "$2"
    git -C "$POOL_CHECKOUT" push origin "$POOL_BRANCH"
}

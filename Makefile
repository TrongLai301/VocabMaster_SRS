# ==============================================================================
# VOCABMASTER SRS - AUTOMATION MAKEFILE
# ==============================================================================

.PHONY: help dev build preview clean sb-start sb-stop sb-status sb-reset sb-migrate-new sb-push sb-pull sb-link

help: ## Hiển thị hướng dẫn các lệnh
	@echo "Danh sách các lệnh hỗ trợ trong dự án:"
	@echo "----------------------------------------------------------------------"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ==============================================================================
# 💻 FRONTEND TASKS
# ==============================================================================
dev: ## Chạy Vite Dev Server (hỗ trợ cả Localhost và IP Network)
	npm run dev

build: ## Kiểm tra TypeScript và build bản Production
	npm run build

preview: ## Xem trước bản build Production
	npm run preview

# ==============================================================================
# 🏠 SUPABASE LOCAL
# ==============================================================================
sb-start: ## Khởi động toàn bộ container Supabase Local (Postgres, Studio, Auth)
	supabase start

sb-stop: ## Dừng toàn bộ container Supabase Local
	supabase stop

sb-status: ## Xem thông tin API URL, Studio URL, Anon Key của Local
	supabase status

sb-reset: ## Reset database local và tự động nạp lại toàn bộ file migrations
	supabase db reset

# ==============================================================================
# ☁️ SUPABASE CLOUD & MIGRATIONS
# ==============================================================================
sb-migrate-new: ## Tạo file migration mới (Ví dụ: make sb-migrate-new name=add_tags)
	@if [ -z "$(name)" ]; then echo "Lỗi: Vui lòng nhập tên migration. Ví dụ: make sb-migrate-new name=ten_migration"; exit 1; fi
	supabase migration new $(name)

sb-diff: ## Xem sự thay đổi schema giữa local và migration files
	supabase db diff

sb-link: ## Liên kết local với Cloud project (Ví dụ: make sb-link project=abcdefgh)
	@if [ -z "$(project)" ]; then echo "Lỗi: Vui lòng nhập project ref. Ví dụ: make sb-link project=your_project_ref"; exit 1; fi
	supabase link --project-ref $(project)

sb-push: ## Đẩy tất cả migration mới từ local lên Cloud Supabase
	supabase db push

sb-pull: ## Kéo schema mới nhất từ Cloud Supabase về local
	supabase db pull

.PHONY: install start stop clean package

install:
	@echo "Installing VigilX via shell script..."
	@bash install.sh

start:
	@echo "Starting VigilX..."
	@docker-compose up -d

stop:
	@echo "Stopping VigilX..."
	@docker-compose down

clean:
	@echo "Stopping and destroying containers + volumes..."
	@docker-compose down -v --remove-orphans

package:
	@echo "Zipping the project into VigilX-App.zip (Excluding git/venv)..."
	@cd .. && zip -r VigilX-App.zip hi -x "hi/.git/*" "hi/.venv/*" "hi/backend/__pycache__/*" "hi/.DS_Store" "hi/extension/*"
	@mv ../VigilX-App.zip ./
	@echo "Done! Hand VigilX-App.zip to the judges."

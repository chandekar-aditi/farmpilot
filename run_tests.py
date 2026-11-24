import subprocess,sys
py = sys.executable
r1 = subprocess.run([py, '-m', 'pytest', 'backend/tests/test_suite.py', '-v', '--tb=short'],
                    cwd=r'C:\Users\aditi\OneDrive\Desktop\Capstone\farmpilot', capture_output=True, text=True)
print(r1.stdout[-6000:] if len(r1.stdout)>6000 else r1.stdout)
print(r1.stderr[-2000:] if r1.stderr else '')


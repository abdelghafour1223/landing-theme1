$sectionsDir = "c:\Users\pc\Desktop\landing-theme1\sections"
$files = Get-ChildItem -Path $sectionsDir -Filter "*.liquid"

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if ($content -match "(?s)\{% schema %\}(.*?)\{% endschema %\}") {
        $schemaText = $Matches[1].Trim()
        try {
            $json = ConvertFrom-Json $schemaText -ErrorAction Stop
        } catch {
            Write-Host "Error in $($file.Name):"
            Write-Host $_.Exception.Message
            Write-Host "----------------"
        }
    }
}

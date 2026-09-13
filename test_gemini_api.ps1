try {
    $uri = 'https://generativelanguage.googleapis.com/v1beta/models?key=PLACEHOLDER'
    $resp = [System.Net.WebRequest]::Create($uri)
    $resp.Method = 'GET'
    try {
        $response = $resp.GetResponse()
        Write-Host "HTTP" ([int]$response.StatusCode)
    } catch [System.Net.WebException] {
        $sc = [int]$_.Exception.Response.StatusCode
        Write-Host "HTTP $sc"
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host $reader.ReadToEnd()
    }
} catch {
    Write-Host "Error: $_"
}

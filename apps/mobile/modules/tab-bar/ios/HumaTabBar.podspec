Pod::Spec.new do |s|
  s.name           = 'HumaTabBar'
  s.version        = '1.0.0'
  s.summary        = 'La barre d’onglets iOS 26 qui revient quand on remonte'
  s.description    = s.summary
  s.license        = 'MIT'
  s.author         = 'humanite-app'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end

{{/*
Expand the name of the chart.
*/}}
{{- define "unikorn-ui.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "unikorn-ui.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "unikorn-ui.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "unikorn-ui.labels" -}}
helm.sh/chart: {{ include "unikorn-ui.chart" . }}
{{ include "unikorn-ui.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "unikorn-ui.selectorLabels" -}}
app.kubernetes.io/name: {{ include "unikorn-ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "unikorn-ui.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "unikorn-ui.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the container images
*/}}
{{- define "unikorn-ui.defaultRepositoryPath" -}}
{{- if .Values.repository }}
{{- printf "%s/%s" .Values.repository .Values.organization }}
{{- else }}
{{- .Values.organization }}
{{- end }}
{{- end }}

{{- define "unikorn-ui.image" -}}
{{- .Values.image | default (printf "%s/unikorn-ui:%s" (include "unikorn-ui.defaultRepositoryPath" .) (.Values.tag | default .Chart.Version)) }}
{{- end }}

{{/*
Create image pull secrets
*/}}
{{- define "unikorn-ui.imagePullSecrets" -}}
{{- if .Values.imagePullSecret -}}
- name: {{ .Values.imagePullSecret }}
{{ end }}
{{- if .Values.dockerConfig -}}
- name: unikorn-ui-docker-config
{{- end }}
{{- end }}
